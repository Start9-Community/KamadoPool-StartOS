FROM debian:bookworm-slim AS ckpool-build
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential autoconf automake libtool pkg-config \
        libzmq3-dev ca-certificates git \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /build
COPY kamado/ckpool/CKPOOL_REPO kamado/ckpool/CKPOOL_COMMIT ./
RUN git clone "$(cat CKPOOL_REPO)" ckpool && git -C ckpool checkout "$(cat CKPOOL_COMMIT)"
COPY kamado/ckpool/patches/ /tmp/kamado-patches/
RUN set -eux; cd ckpool; \
    for p in /tmp/kamado-patches/*.patch; do git apply --verbose "$p"; done
# -march=native dropped from upstream's CFLAGS so the binary runs on any CPU of the target arch
RUN cd ckpool \
    && ./autogen.sh \
    && CFLAGS="-O2 -Wall -pipe" ./configure --prefix=/usr/local \
    && make -j"$(nproc)"

# The dashboard and the API cross-compile, so only ckpool and the runtime stage run emulated
FROM --platform=$BUILDPLATFORM node:22-bookworm-slim AS ui-build
WORKDIR /ui
COPY kamado/ui/package.json kamado/ui/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY kamado/ui/ ./
RUN npm run build

FROM --platform=$BUILDPLATFORM golang:1.22-bookworm AS api-build
ARG TARGETARCH
WORKDIR /src
COPY kamado/api/go.mod kamado/api/go.sum ./
RUN go mod download
COPY kamado/api/ ./
RUN rm -rf internal/webui/dist
COPY --from=ui-build /ui/dist/ internal/webui/dist/
RUN CGO_ENABLED=0 GOOS=linux GOARCH="${TARGETARCH}" go build \
        -trimpath -ldflags="-s -w" -o /out/kamado-api ./cmd/kamado-api

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates curl jq libzmq5 stunnel4 openssl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=ckpool-build /build/ckpool/src/ckpool /build/ckpool/src/ckpmsg /usr/local/bin/
COPY --from=api-build /out/kamado-api /usr/local/bin/kamado-api
COPY --chmod=755 assets/scripts/kamado-ckpool-run.sh assets/scripts/kamado-tls-init.sh /usr/local/bin/

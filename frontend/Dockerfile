# ====== 第一阶段：前端构建 ======
FROM node:18-alpine AS builder

WORKDIR /build
# 先复制 package 文件并安装依赖（利用 Docker 缓存层）
COPY package.json package-lock.json ./
RUN npm ci

# 复制源码并构建
COPY . .
RUN npm run build

# ====== 第二阶段：Nginx 托管 ======
FROM nginx:alpine

# 复制自定义 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 复制前端构建产物
COPY --from=builder /build/dist /usr/share/nginx/html

EXPOSE 80

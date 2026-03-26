# ====== 第一阶段：Maven 构建 ======
FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /build
# 先复制 pom.xml 并下载依赖（利用 Docker 缓存层）
COPY pom.xml .
RUN mvn dependency:go-offline -B

# 复制源码并打包
COPY src ./src
RUN mvn package -DskipTests -B

# ====== 第二阶段：运行 ======
FROM eclipse-temurin:21-jre

WORKDIR /app

# 创建数据目录
RUN mkdir -p /app/data

# 从构建阶段复制 jar 包
COPY --from=builder /build/target/*.jar app.jar

# 暴露端口
EXPOSE 3000

# 启动命令 — 覆盖 SQLite 数据库路径到 Volume 挂载点
ENTRYPOINT ["java", "-jar", "app.jar", \
    "--spring.datasource.url=jdbc:sqlite:/app/data/poke_three.db"]

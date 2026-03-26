package com.pokethree.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.server.standard.ServerEndpointExporter;

/**
 * WebSocket 配置
 * 启用 JSR-356 标准 @ServerEndpoint 支持
 */
@Configuration
public class WebSocketConfig {

    /**
     * 注册 ServerEndpoint，使 @ServerEndpoint 注解生效
     */
    @Bean
    public ServerEndpointExporter serverEndpointExporter() {
        return new ServerEndpointExporter();
    }
}

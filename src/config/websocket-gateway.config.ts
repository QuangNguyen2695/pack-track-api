export const defaultWebSocketGatewayConfig = {
    cors: {
      origin: '*', // Địa chỉ nguồn của ứng dụng Ionic
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/socket.io', // Đường dẫn socket
  };
  
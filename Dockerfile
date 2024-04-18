# 指定基础镜像
FROM node:18.19.0 
# 安装所需软件和依赖项
RUN apt-get update && apt-get install -y \ 
libnss3-dev libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 libcups2-dev libdrm2 libgtk-3-0 libgbm1 libasound2 dbus
# 工作目录
WORKDIR /app
# 将所有源代码（不包括 .dockerignore 定义的文件）都复制到工作目录 app 中
COPY . /app
# 在容器中安装依赖
RUN npm install
# COPY . . --exclude=node_modules
# RUN mkdir -p /run/dbus
# ENV DBUS_SESSION_BUS_ADDRESS unix:path=/tmp/dbus-oQkHHMjAbD,guid=3cb0b3c8f32cf0097ef8461d6620fa1b
# RUN /etc/init.d/dbus start
# RUN dbus-daemon --config-file=/usr/share/dbus-1/system.conf
# RUN dbus-daemon --system
# 暴露的端口号
EXPOSE 4658
# 启动 Docker 容器的命令
CMD ["npm", "start"]
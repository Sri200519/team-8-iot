FROM nginx:1.27-alpine

COPY dashboard-ui/nginx.conf /etc/nginx/conf.d/default.conf
COPY dashboard-ui/index.html /usr/share/nginx/html/index.html
COPY dashboard-ui/styles.css /usr/share/nginx/html/styles.css
COPY dashboard-ui/app.js /usr/share/nginx/html/app.js

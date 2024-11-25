FROM node:20-alpine
RUN apk update
RUN apk add git
RUN git clone https://github.com/pknw1-automation/jsonresume-theme-class.git /jsonresume
ADD entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
WORKDIR /jsonresume
RUN npm ci
ENTRYPOINT ["/entrypoint.sh"]
CMD ["npx", "resume", "export", "--theme", ".", "--resume", "/json/latest.json", "/html/latest.html"]

FROM nikolaik/python-nodejs:python3.7-nodejs16-slim
RUN mkdir /home/dvws-node
WORKDIR /home/dvws-node
RUN apt-get update && apt-get install -y git build-essential --no-install-recommends
COPY . .
RUN npm install --build-from-source
ADD https://github.com/ufoscout/docker-compose-wait/releases/download/2.9.0/wait /wait
RUN chmod +x /wait

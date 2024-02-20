# OpenCoder

Open-source "serverless" collaborative coding and execution site.

[Try it!](https://site.fzxu.me/opencoder)

Or host yourself:

First, clone the repo:
```shell
git clone https://github.com/KevinXuxuxu/opencoder.git
cd opencoder
```

- If you already have flask setup:

```shell
flask run -h 0.0.0.0 -p 80
```

- Otherwise
```shell
# build docker
docker build . -t opencoder
# run the docker container
docker run -p 8888:80 -v `pwd`:/root/opencoder opencoder
```

# OpenCoder

Open-source light-weight "serverless" collaborative coding and execution site, powered by [codapi](https://codapi.org/) and [PeerJS](https://peerjs.com/).

The connection is p2p fully based on generated peer_id, and code execution runs in [WASI](https://wasi.dev/) environment in browser. As a result it is truly "serverless" and able to be hosted as a static site and even through CDN.

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
docker run -p 8888:8888 -v `pwd`:/root/opencoder opencoder
```
Then visit http://localhost:8888 and have fun :)
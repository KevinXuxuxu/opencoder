FROM ubuntu:22.04

RUN apt update && apt install -y python3 python3-pip

RUN pip install flask

COPY . /root/opencoder

WORKDIR /root/opencoder

CMD ["flask", "run", "-h", "0.0.0.0", "-p", "8888"]

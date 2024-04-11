const https = require("https");
const WebSocket = require("isomorphic-ws");

const parameter = "8cee869baf37a7682e9931d51cba09b6";

const GetDataFromRes = async (res) => {
    let result = '';
    res.setEncoding("utf8");
    await res.on('data', (chunk) => { result += chunk; });
    
    return result;
}

(async () => {
    https.get(`https://api.chzzk.naver.com/polling/v2/channels/${parameter}/live-status`, async (res) => {
        let str = await GetDataFromRes(res);
        let channelId = JSON.parse(str).content.chatChannelId;
        
        let url = `https://comm-api.game.naver.com/nng_main/v1/chats/access-token?channelId=${channelId}&chatType=STREAMING`;
        await https.get(url, async (accessRes) => {
            str = await GetDataFromRes(accessRes);
            let token = JSON.parse(str).content.extraToken;
            
            const ws = new WebSocket("wss://kr-ss5.chat.naver.com/chat");
            
            ws.onopen = () => {
                const json = JSON.stringify({
                    "ver": "2",
                    "cmd": 100,
                    "svcid": "game",
                    "cid": channelId,
                    "bdy": {
                      "uid": null,
                      "devType": 2001,
                      "accTkn": token,
                      "auth": "READ"
                    },
                    "tid": 1
                  })
                ws.send(json);
            }
            
            ws.onmessage = (data) => {
                let parsed = JSON.parse(data.data);
                if(parsed.cmd == 10100) {
                    console.log(parsed);
                    ws.send(JSON.stringify({
                        "ver": "2",
                        "cmd": 5101,
                        "svcid": parsed.svcid,
                        "cid": parsed.cid,
                        "sid": parsed.bdy.sid,
                        "bdy": {
                            "recentMessageCount": 1000
                        },
                        "tid": 2
                    }));
                } else if(parsed.cmd == 15101) {
                    console.log(parsed);
                    parsed.bdy.messageList.forEach(message => {
                        const extras = JSON.parse(message.extras);
                        if(extras["payAmount"])
                            console.log(`${extras.nickname} : ${extras["payAmount"]}`);
                    });
                }
            };
        })
    });
})();
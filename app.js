const tmi = require("tmi.js");
const _ = require("lodash");

let cooldowns = new Set();

//!çekiliş {{winner}} {{timeout/dk}} {{prize}}
let config = {
    "username": "xaronbot",
    "oauth": "REDACTED",
    "channels": ["xaronnn"],
    "bad_words": ["anan", "oç", "orospu", "kaşar", "piç", "anneni", "sikeyim", "sikim", "sikem", "pic", "kaltak", "pezevenk", "pezo", "amcık", "amını", "götünü", ".com", ".net", ".org", ".tv", "http", "https", "://", ".co", "www.", "sürtük", "surtuk", "sürtuk", "surtük", "o.ç", "o.c", "0.ç", "0.c", "0ç", "0c", "yarram", "kevaşe", "sıkem"],
    "prefix": "!",
    "replies": [
        {
            "moderator_only": false,
            "needle": ["sa", "selam", "slm", "s.a"],
            "reply": "@{{username}} as hg"
        },
        {
            "moderator_only": false,
            "needle": ["!insta", "!ig", "!instagram", "!ing", "!ins"],
            "reply": "@{{username}} https://instagram.com/xaron1337"
        },
        {
            "moderator_only": false,
            "needle": ["!github", "!git", "!gh", "!code"],
            "reply": "@{{username}} https://github.com/xaronnn"
        },
        {
            "moderator_only": true,
            "needle": ["!clear", "!temizle", "!sil"],
            "useFunction": (client) => {
                client.clear(config.channels[0])
            }
        },
        {
            "moderator_only": false,
            "needle": ["!zarat", "!zar", "!dice"],
            "reply": "@{{username}} zar attın: {{dice}}"
        },
    ],
    "timed_messages": [
        {
            "message": "",
            "interval": 60
        }
    ],
    "giveaway": {
        "active": false,
        "timeout": null,
        "prize": null,
        "winner": null,
        "users": []
    }
}

const rollDice = () => {
    const rolled1 = (Math.floor(Math.random() * 6) + 1);
    const rolled2 = (Math.floor(Math.random() * 6) + 1);
    if(rolled1 == 1 && rolled2 == 1) {
        return "1+1=2, hep yek";
    } else if(rolled1 == 2 && rolled2 == 2) {
        return "2+2=4, dubara";
    } else if(rolled1 == 3 && rolled2 == 3) {
        return "3+3=6, düşse";
    } else if(rolled1 == 4 && rolled2 == 4) {
        return "4+4=8, dörtcar";
    } else if(rolled1 == 5 && rolled2 == 5) {
        return "5+5=10, dübeş";
    } else if(rolled1 == 6 && rolled2 == 6) {
        return "6+6=12, düşeş";
    } else {
        return rolled1+"+"+rolled2+"="+(parseInt(rolled1)+parseInt(rolled2));
    }
}

const isModerator = (tags) => {
    if(tags.badges == null) return false;
    return (tags.mod || tags.badges.broadcaster == "1" ? true : false);
}
const isBroadcaster = (tags) => {
    return (tags.badges.broadcaster == "1" ? true : false);
}

const fetchReplyFromMessage = (client, tags, message, replaces = null) => {
    let reply = false;
    let reject = false;
    message = message.split(" ")[0];
    _.find(config.replies, (d) => {
        if(d.needle.includes(message)) {
            if(d.moderator_only) {
                if(tags.mod || tags.badges.broadcaster == "1") {
                    reject = false;
                } else {
                    reject = true;
                }
            }
            if(!reject) {
                try {
                    if(d.useFunction) {
                        d.useFunction(client);
                    }
                } catch(err) { }
                if(d.reply) {
                    reply = d.reply;
                }
            }
        }
    })
    if(replaces && reply != null && !reject) {
        if(typeof replaces == "object") {
            if(Object.keys(replaces).length >= 1) {
                Object.keys(replaces).forEach((k) => {
                    if(reply.includes("{{"+k+"}}")) {
                        if(replaces[k]) {
                            reply = reply.replace("{{"+k+"}}", replaces[k])
                        }
                    }
                })
            }
        }
    }
    return (!reject ? (reply ? reply : false) : false);
}

const addCooldown = (username, timeout) => {
    if(!username || !timeout) return;
    cooldowns.add(username);
    setTimeout(() => {
        cooldowns.delete(username);
    }, timeout*1000);
}

const badWords = (message) => {
    if(config.bad_words.indexOf(message.toLowerCase()) !== -1 || config.bad_words.includes(message.toLowerCase())) {
        return true;
    } else {
        return false;
    }
}

const client = new tmi.Client({
    options: { debug: true },
    connection: {
        secure: true,
        reconnect: true
    },
    identity: {
        username: config.username,
        password: config.oauth
    },
    channels: config.channels
});

client.on("message", (channel, tags, message, self) => {
    if (self) return;
    if(cooldowns.has(tags.username)) return;
    if(badWords(message) && !isModerator(tags)) {
        client.deletemessage(config.channels[0], tags.id).catch();
        client.timeout(config.channels[0], tags.username, 30, "Kötü kelime kullanımı.").catch()
    }
    if(!isModerator(tags)) addCooldown(tags.username, (tags.subscriber ? 1.5 : 3));
    if(fetchReplyFromMessage(client, tags, message)) {
        client.say(channel, fetchReplyFromMessage(client, tags, message, {"username": tags.username, "dice": rollDice()}));
    } else {
        const command = message.split(" ")[0];
        if(command.startsWith(config.prefix)) {
            if(message.split(" ").length <= 1) {
                if(["!katıl", "!katil"].includes(command)) {
                    if(config.giveaway.active) {
                        if(!config.giveaway.users.includes(tags.username)) {
                            config.giveaway.users.push(tags.username);
                            try {
                                client.whisper(tags.username, "Çekilişe başarıyla katıldın.").catch();
                                throw ("DM yollanamadı")
                            } catch(err) {}
                            client.say(channel, "@"+tags.username+" çekilişe başarıyla katıldın.")
                        } else {
                            client.say(channel, "@"+tags.username+" bu çekilişe zaten katıldın.")
                        }
                    } else {
                        client.say(channel, "@"+tags.username+" aktif bir çekiliş bulunamadı.")
                    }
                }
            }
            if(["!çekiliş", "!cekilis", "!giveaway"].includes(command)) {
                if(isBroadcaster(tags)) {
                    let prize = "";
                    message = message.split(" ");
                    if(message.length >= 4) {
                        config.giveaway.active = true;
                        config.giveaway.timeout = message[2]*60;
                        config.giveaway.winner = message[1];
                        message[0] = null;
                        message[1] = null;
                        message[2] = null;
                        message = message.filter(Boolean);
                        message.forEach((m) => {
                            prize += m + " "
                        })
                        config.giveaway.prize = prize;
                        client.action(channel, prize.toUpperCase()+" ödüllü "+config.giveaway.winner+" kişinin kazanabileceği çekiliş başladı ve "+Math.floor(config.giveaway.timeout/60)+" dakika kaldı. Katılmak için sohbete !katıl yaz!");
                        let giveawayInterval = setInterval(() => {
                            if(config.giveaway.timeout > 0) {
                                config.giveaway.timeout = config.giveaway.timeout - 1;
                                if(config.giveaway.timeout == 900) {
                                    client.action(channel, config.giveaway.prize.toUpperCase()+ " ödüllü çekilişin bitmesine 15 dakikadan az bir süre kaldı! Katılmak için sohbete !katıl yaz!");
                                } else if(config.giveaway.timeout == 600) {
                                    client.action(channel, config.giveaway.prize.toUpperCase()+ " ödüllü çekilişin bitmesine 10 dakikadan az bir süre kaldı! Katılmak için sohbete !katıl yaz!");
                                } else if(config.giveaway.timeout == 300) {
                                    client.action(channel, config.giveaway.prize.toUpperCase()+ " ödüllü çekilişin bitmesine 5 dakikadan az bir süre kaldı! Katılmak için sohbete !katıl yaz!");
                                } else if(config.giveaway.timeout == 180) {
                                    client.action(channel, config.giveaway.prize.toUpperCase()+ " ödüllü çekilişin bitmesine 3 dakikadan az bir süre kaldı! Katılmak için sohbete !katıl yaz!");
                                } else if(config.giveaway.timeout == 120) {
                                    client.action(channel, config.giveaway.prize.toUpperCase()+ " ödüllü çekilişin bitmesine 2 dakikadan az bir süre kaldı! Katılmak için sohbete !katıl yaz!");
                                } else if(config.giveaway.timeout == 60) {
                                    client.action(channel, config.giveaway.prize.toUpperCase()+ " ödüllü çekilişin bitmesine 1 dakikadan az bir süre kaldı! Katılmak için sohbete !katıl yaz!");
                                } else if(config.giveaway.timeout == 30) {
                                    client.action(channel, config.giveaway.prize.toUpperCase()+ " ödüllü çekilişin bitmesine 30 saniyeden az bir süre kaldı! Katılmak için sohbete !katıl yaz!");
                                } else if(config.giveaway.timeout == 15) {
                                    client.action(channel, config.giveaway.prize.toUpperCase()+ " ödüllü çekilişin bitmesine 15 saniyeden az bir süre kaldı! Katılmak için sohbete !katıl yaz!");
                                } else if(config.giveaway.timeout == 1) {
                                    if(config.giveaway.users.length == 0) {
                                        client.action(channel, config.giveaway.prize.toUpperCase()+ " ödüllü çekiliş sona erdi, katılan olmadığı için kimse kazanamadı :(");
                                    } else if(config.giveaway.users.length < 2) {
                                        client.action(channel, config.giveaway.prize.toUpperCase()+ " ödüllü çekiliş sona erdi, en az 2 katılan olmadığı için kimse kazanamadı :(");
                                    } else {
                                        client.emoteonly(channel);
                                        let tempWinners = "";
                                        _.sampleSize(config.giveaway.users, config.giveaway.winner).forEach((k) => {
                                            try {
                                                client.whisper(k, config.giveaway.prize.toUpperCase()+" ödüllü çekilişi kazandın!").catch();
                                                throw ("DM yollanamadı")
                                            } catch(err) {}
                                            tempWinners += "@"+k+" ";
                                            if(config.giveaway.prize.split(' ').join('').toLowerCase() == "vip") {
                                                client.vip(channel, k).catch((err) => {
                                                    console.log(err);
                                                    client.vip(channel, k).catch((err) => {
                                                        console.log(err);
                                                    });
                                                });
                                                setTimeout(() => {
                                                    client.action(channel, "@"+k+" artık VIP!");
                                                }, 3000);
                                            }
                                        })
                                        client.action(channel, config.giveaway.prize.toUpperCase()+ " ödüllü çekiliş sona erdi, kazanan"+(tempWinners.split(" ").length >= 2 ? "lar" : "")+" "+tempWinners);
                                        setTimeout(() => {
                                            client.action(channel, config.giveaway.prize.toUpperCase()+ " ödüllü çekiliş sona erdi, kazanan"+(tempWinners.split(" ").length >= 2 ? "lar" : "")+" "+tempWinners);
                                            setTimeout(() => {
                                                client.action(channel, config.giveaway.prize.toUpperCase()+ " ödüllü çekiliş sona erdi, kazanan"+(tempWinners.split(" ").length >= 2 ? "lar" : "")+" "+tempWinners);
                                                client.emoteonlyoff(channel);
                                            }, 500)
                                        }, 500);
                                        
                                        config.giveaway.active = false;
                                        setTimeout(() => {
                                            tempWinners = "";
                                            prize = "";
                                            config.giveaway.winner = null;
                                            config.giveaway.prize = null;
                                            config.giveaway.timeout = null;
                                            config.giveaway.users = null;
                                            config.giveaway.users = [];
                                            clearInterval(giveawayInterval);
                                        }, 15000);
                                    }
                                    
                                }
                            }
                        }, 1000);
                    }
                } else {
                    client.say(channel, "@"+tags.username+" bu komutu sadece yayıncı kullanabilir.")
                }
            }
        }
    }
});

client.connect();

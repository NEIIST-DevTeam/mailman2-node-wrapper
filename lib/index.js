"use strict";

const request = require('request-promise');
const querystring = require('querystring');
const csrfRegExp = /<input.*?name=(\'|")csrf_token("|\'").*?>/;
const csrfValRegExp = /value=(?:\'|")(.*?)(?:\'|")/;

function Options(encodedEmail){
    this.setModeration = (status) => {
        this.mod = status;
        return this;
    }
    this.setRealName = (name) => {
        this.realname = name;
        return this;
    }
    this.prepare = () => {
        const options = {};
        Object.entries(this).forEach(([key, value]) => {
            if(typeof value !== 'function') options[encodedEmail + '_' + key] = value;
        });
        return options;
    }
};

class Client {
    
    constructor(host, group) {
        this.host = host;
        this.group = group;
        this.jar = request.jar();
    }
    
    async login(password) {
        try {
            await request.post({
                url: this.host + '/admin/' + this.group,
                form: {
                    adminpw: password,
                    admlogin: 'Let+me+in...'
                },
                jar: this.jar
            });
            return true;
        }
        catch (err) {
            return false;
        }
    }
    
    async subscribe(who, welcome = true, notify = true) {
        if (!Array.isArray(who)) who = [who];
        
        try {
            await request.post({
                url: this.host + '/admin/' + this.group + '/members/add',
                jar: this.jar,
                form: {
                    csrf_token: await this.getCSRF(this.host + '/admin/' + this.group + '/members/add'),
                    subscribees: who.join('\n'),
                    subscribe_or_invite: 0,
                    send_welcome_msg_to_this_batch: !!welcome,
                    send_notifications_to_list_owner: !!notify,
                    setmemberopts_btn: 'Submit your changes'
                }
            });
            return true;
        }
        catch (err) {
            return false;
        }
    }
    
    async unsubscribe(who, bye = true, notify = true) {
        if (!Array.isArray(who)) who = [who];

        try {
            await request.post({
                url: this.host + '/admin/' + this.group + '/members/remove',
                jar: this.jar,
                form: {
                    csrf_token: await this.getCSRF(this.host + '/admin/' + this.group + '/members/remove'),
                    unsubscribees: who.join('\n'),
                    send_unsub_ack_to_this_batch: !!bye,
                    send_unsub_notifications_to_list_owner: !!notify,
                    setmemberopts_btn: 'Submit your changes'
                }
            });
            return true;
        }
        catch (err) {
            return false;
        }
    }

    async getOptions(who) {
        const encodedEmail = querystring.escape(who);
        const options = new Options(encodedEmail);
        try {
            const data = await request.post({
                url: this.host + '/admin/' + this.group + '/members/list',
                jar: this.jar,
                form: {
                    findmember: who,
                    findmember_btn: 'Search...'
                }
            });
            const opts = 'realname|mod|hide|nomail|ack|notmetoo|nodupes|digest|plain';
            const reg = new RegExp('<input.*?name="' + encodedEmail + '_(' + opts + ')".*?value="(.*?)".*?>', 'ig');
            
            let found;
            while(found = reg.exec(data)){
                options[found[1]] = found[2];
            }
            return options;
        }
        catch (err) {
            return false;
        }
    }

    async setModeration(who, mod) {
        const encodedEmail = querystring.escape(who);
        const options = (await this.getOptions(who)).setModeration(who ? 'on' : 'off');
        try {
            await request.post({
                url: this.host + '/admin/' + this.group + '/members/list',
                jar: this.jar,
                form: {
                    csrf_token: await this.getCSRF(this.host + '/admin/' + this.group + '/members/list'),
                    findmember: who,
                    user: encodedEmail,
                    ...options.prepare(),
                    setmemberopts_btn: 'Submit your changes'
                }
            });
            return true;
        }
        catch (err) {
            return false;
        }
    }

    async setRealName(who, realname) {
        const encodedEmail = querystring.escape(who);
        const options = (await this.getOptions(who)).setRealName(realname);
        try {
            await request.post({
                url: this.host + '/admin/' + this.group + '/members/list',
                jar: this.jar,
                form: {
                    csrf_token: await this.getCSRF(this.host + '/admin/' + this.group + '/members/list'),
                    findmember: who,
                    user: encodedEmail,
                    ...options.prepare(),
                    setmemberopts_btn: 'Submit your changes'
                }
            });
            return true;
        }
        catch (err) {
            return false;
        }
    }
    
    async listSubscribers() {
        try {
            let subscribers = [];
            let body = await request.get({
                url: this.host + '/roster/' + this.group,
                jar: this.jar
            });
            const regExp = new RegExp('<a.*?href=(?:"|\').*?/options/' + this.group +
                '/.*?(?:--at--|@).*?(?:"|\')-*?>(.*?(?:(?:|)*at(?:|)*|@).*?)</a>', 'g');
            
            let match;
            while (match = regExp.exec(body)) {
                subscribers.push(match[1].replace(' at ', '@').replace(' ', ''));
            }
            return subscribers;
        }
        catch (err) {
            return false;
        }
    }
    
    async getCSRF(where){
        try {
            let body = await request.get({
                url: where,
                jar: this.jar
            });

            let match = csrfRegExp.exec(body);
            if(match){
                match = csrfValRegExp.exec(match[0]);
                if(match){
                    return match[1];
                }
            }
            return false;
        }
        catch(err){
            return false;
        }
    }
}

module.exports = Client;
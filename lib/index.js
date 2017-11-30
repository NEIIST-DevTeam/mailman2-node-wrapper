"use strict";

const request = require('request-promise');
const csrfRegExp = /<input.*?name=(\'|")csrf_token("|\'").*?>/;
const csrfValRegExp = /value=(?:\'|")(.*?)(?:\'|")/;

class Client {
    
    constructor(host, group) {
        this.host = host;
        this.group = group;
        this.jar = request.jar();
    }
    
    async login(password) {
    }
    
    async subscribe(who, welcome = true, notify = true) {
    }
    
    async unsubscribe(who, bye = true, notify = true) {
    }
    
    async listSubscribers() {
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
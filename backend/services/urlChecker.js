import {fastify} from "fastify";
const app = fastify();

const API= "http://checkurl.phishtank.com/checkurl/";
app.get(`urlChecker`, async (request,reply)=>{
  request.headers={
    "User-Agent":"checker"
  }
  request.params={
    "format":"json"
  }
  
}) 
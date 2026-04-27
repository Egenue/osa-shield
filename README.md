###Guide
##To install packaged 

###npm install --legacy-peer-deps

###RUnn frontend 
##npm run dev

###Run backend
##npm run server

#to install redis ensuring you have docker 
docker run -d \ --name redis-phish \ -p 6379:6379 \ redis 
#once created 
docker start redis-phish
#to stop
docker stop redis-phish
#ingest should be run once a day  or if you restart your computer #may create a script for this 
node /path-to/ingest.js
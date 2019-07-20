const ngrok = require('./ngrok');
const Server = require('./server');
const aws = require('./aws');
const Stream = require('./stream');

const config = {
  restApiId: process.env.AWS_REST_API_ID,
  viewerResourceId: process.env.VIEWER_RESOURCE_ID,
  oauthResourceId: process.env.OAUTH_RESOURCE_ID,
  httpMethod: 'GET',
  slackClientId: process.env.SLACK_CLIENT_ID,
  slackClientSecret: process.env.SLACK_CLIENT_SECRET,
  wsId: process.env.WORKSTATION_ID,
  privateKey: process.env.LIVE_PRIVATE_KEY,
};

const disk = new Stream('bushitsuchan');
disk
  .run()
  .then(async (mountPath) => {
    const ngrokUrl = await ngrok.run(process.env.NGROK_TOKEN);
    const awsUrl = await aws.run(config, ngrokUrl);
    // console.log(`Remote URL: ${awsUrl}`);

    const server = new Server(ngrokUrl, awsUrl, mountPath, config);
    server.run();
  })
  .catch((e) => {
    disk.close();
    console.error(e);
  });

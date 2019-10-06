const { WebClient } = require('@slack/web-api');
const axios = require('axios');
const crypto = require('crypto');
const object = require('json-templater/object');
const fs = require('fs');
const base64url = require('base64-url');
const Redis = require('ioredis');

const redis = new Redis({
  host: 'redis',
  keyPrefix: 'slack:',
});

module.exports.objectsNotification = async (web) => {
  const { photoId } = await axios.post('http://media/photo').then((result) => result.data);

  const [awsUrl, objects] = await Promise.all([
    axios.get('http://tunnel').then((result) => result.data.awsUrl),
    axios.get('http://object-detection/faster_rcnn_resnet101_coco', { params: { photo_id: photoId } }).then((result) => result.data),
  ]);

  const text = objects.label_name.map((value, index) => `- \`${value}\`: ${objects.confidence[index].toFixed(3)}`).join('\n') || '何も検出されませんでした';

  const blocks = object(
    JSON.parse(fs.readFileSync('./block_template_detection.json', 'utf8')),
    {
      image_url: 'https://4.bp.blogspot.com/-ZHlXgooA38A/Wn1WVe2XBhI/AAAAAAABKJY/5BE6ZAbyeRwv3UlGsVU2YfPWVS_uT0PFQCLcBGAs/s800/text_kakko_kari.png',
      text,
      time: new Date().toLocaleString(),
      viewer_url: `${awsUrl}/viewer`,
      photo_viewer_url: `${awsUrl}/photo-viewer`,
      contact_channel: process.env.CONTACT_CHANNEL,
    },
  );

  const ts = await redis.get('previous_ts');

  if (ts) {
    web.chat.update({
      channel: process.env.NOTIFICATION_CHANNEL,
      text: '[定期]部室スキャン',
      ts,
      icon_emoji: ':slack:',
      blocks,
    });
  } else {
    const result = await web.chat.postMessage({
      channel: process.env.NOTIFICATION_CHANNEL,
      text: '[定期]部室スキャン',
      ts,
      icon_emoji: ':slack:',
      blocks,
    });
    redis.set('previous_ts', result.ts);
  }
};

module.exports = {
  apps: [{
    name: 'freedom-bot',
    script: './index.js',
    cwd: 'C:\\Users\\cdann\\project\\my-dashboard\\bot',
    instances: 1,
    exec_mode: 'fork',
    env: {
      HTTPS_PROXY: 'http://rXpSsZ:C7odgw@209.127.8.228:9359',
      HTTP_PROXY:  'http://rXpSsZ:C7odgw@209.127.8.228:9359'
    }
  }]
};

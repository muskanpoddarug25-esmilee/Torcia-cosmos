const payload = {
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "999521902827405",
      "changes": [
        {
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "display_phone_number": "15552001187",
              "phone_number_id": "1107174769155296"
            },
            "contacts": [
              {
                "profile": {
                  "name": "Nishant"
                },
                "wa_id": "9779705769125",
                "user_id": "NP.1499048778053902",
                "country_code": "NP"
              }
            ],
            "messages": [
              {
                "from": "9779705769125",
                "from_user_id": "NP.1499048778053902",
                "id": "wamid.HBgNOTc3OTcwNTc2OTEyNRUCABIYIEFDRTdFM0U2MkU1OTk5RUI0MTdDQ0UxNTE1OTVBRkY2AA==",
                "timestamp": "1782584546",
                "text": {
                  "body": "Cggg"
                },
                "from_logical_id": "50947321516244",
                "type": "text"
              }
            ]
          },
          "field": "messages"
        }
      ]
    }
  ]
};

const crypto = require('crypto');
const appSecret = process.env.META_APP_SECRET || '4f7bf48adf63bbdccdbe0e4fdef54ff4'; 
const rawBody = JSON.stringify(payload);
const signature = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody, 'utf-8').digest('hex');

fetch('http://localhost:3000/api/webhook/whatsapp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-hub-signature-256': signature
  },
  body: rawBody
}).then(r => console.log('Simulated Webhook Sent! Status:', r.status)).catch(e => console.error(e));

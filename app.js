const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();

// Convenience middleware to parse JSON body
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// These credentials should be received from the onboarding team.
// These are account specific credentials

const { API_KEY, IDENTITY_API_URL, SINGLE_ORDER_URL, RECURRING_ORDER_URL, PORT, REALM } = process.env;

if (!API_KEY || !IDENTITY_API_URL || !RECURRING_ORDER_URL || !SINGLE_ORDER_URL) {
  console.error("Error!!! Env configs not found");
  process.exit();
}

app.get('/health', (_, res) => {
  console.log("App is running")
  res.send('App workng')
});

/* 
  Example route that handles order creation, a similar route should be implemented
  on your server to create orders and the response should be sent to the client 
*/
app.post('/api/createOrder', async (req, res) => {

  // Authenticate and receive bearer token
  try {

    const { data } = await axios({
      method: 'post',
      url: IDENTITY_API_URL,
      headers: {
        'Content-Type': 'application/vnd.ni-identity.v1+json',
        'Authorization': `Basic ${API_KEY}`
      },
      data: {
       grant_type: 'client_credentials',
       realmName: REALM,
      }
    });

    const { access_token } = data;
    console.log("access token is ", access_token)

    let createOrderUrl = SINGLE_ORDER_URL
    let contentType = "application/vnd.ni-payment.v2+json"

    console.log(`request body is ${JSON.stringify(req.body)}`)
    if(req.body.type == "RECURRING") {
      createOrderUrl = RECURRING_ORDER_URL
      contentType = "application/vnd.ni-recurring-payment.v2+json"
    }


    // Create the order using the bearer token received from previous step and the order data received from client
    // Refer docs for the possible fields available for order creation

    console.log(`hitting ${createOrderUrl}`)
    const { data: orderData } = await axios.post(createOrderUrl, {
      ...req.body
    }, {
      headers: {
        'Authorization': `Bearer ${access_token}`, // Note the access_token received in the previous step is passed here
        'Content-Type': contentType,
        'Accept': contentType
      },
    },
    );
    const responseString = JSON.stringify(orderData);
    const response = responseString.replaceAll("http://transaction-service","https://api-gateway.infradev.ksa.ngenius-payments.com")
    
    res
      .status(200)
      .send(JSON.parse(response))

  } catch (error) {
    console.log("logging error")
    console.error(JSON.stringify(error));
    res
      .status(400)
      .send({
        error,
        message: 'An error occured',
      });
  }
});

app.listen(PORT || 3000, () => console.log(`Example app listening on port ${PORT}!`));

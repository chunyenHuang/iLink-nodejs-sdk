const axios = require('axios');

module.exports = class ILink {
  constructor({
    env = 'sandbox',
    clientId, // 客戶代號
    clientKey, // 客戶代碼
    appKey,
    iv,
  }) {
    this.env = env;
    this.apiUrl = env === 'sandbox' ?
      '' :
      '';
    this.clientId = clientId;
    this.clientKey = clientKey;
    this.appKey = appKey;
    this.iv = iv;
  }

  async submitOrder(order) {
    const { apiUrl } = this;
    const options = {
      method: 'POST',
      url: `${apiUrl}/orders`,
      data: order,
      headers: await this._getApiHeaders(),
    };

    const { data } = await axios(options);
    return data;
  }

  async getOutlet(id) {
    const { apiUrl } = this;
    const options = {
      method: 'GET',
      url: `${apiUrl}/outlets/${id}`,
      headers: await this._getApiHeaders(),
    };

    const { data } = await axios(options);
    return data;
  }
};

const axios = require('axios');
const qs = require('qs');
const crypto = require('crypto');

const getCsrf = (data, csrfKeys, iv) => {
  const string = csrfKeys.reduce((s, key) => s + data[key], '') + iv;
  const sha1Data = crypto.createHash('sha1').update(string).digest('hex');
  const md5Data = crypto.createHash('md5').update(sha1Data).digest('hex');
  return md5Data;
};

module.exports = class ILink {
  constructor({
    env = 'sandbox',
    clientId, // 客戶代號
    storeCode, // 客戶代碼
    appKey,
    iv,
  }) {
    this.env = env;
    this.apiUrl = env === 'sandbox' ? 'https://runerrandstest.global-business.com.tw:44380/api/third/v1' : 'https://runerrands.global-business.com.tw/api/third/v1';
    this.clientId = clientId;
    this.storeCode = storeCode;
    this.appKey = appKey;
    this.iv = iv;
  }

  async getApiHeaders() {
    const { appKey } = this;

    return {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: appKey,
    };
  }

  async request(payload, options = {}) {
    try {
      const { apiUrl, storeCode, iv } = this;

      let updatedData;
      if (payload.data) {
        updatedData = Object.assign(payload.data, {
          store_code: storeCode,
          csrf: getCsrf(payload.data, options.csrfKeys, iv),
        });
        console.log(updatedData);
      }

      Object.assign(payload, {
        url: `${apiUrl}/${payload.url}`,
        data: updatedData ? qs.stringify(updatedData) : undefined,
      });

      console.log(payload);
      const { data } = await axios(payload);
      return data;
    } catch (e) {
      // console.log(e);
      const error = e.toJSON();
      throw new Error(error.message);
    }
  }

  async makeQuote(order) {
    const payload = {
      method: 'POST',
      url: 'orders/quotation',
      data: order,
      headers: await this.getApiHeaders(),
    };

    return this.request(payload, { csrfKeys: ['original_area', 'dest_area'] });
  }

  async listOrders(yyyymm, page = 1, perPage = 20) {
    const payload = {
      method: 'GET',
      url: `bills/list/${yyyymm}?page=${page}&per_page=${perPage}`,
      headers: await this.getApiHeaders(),
    };

    return this.request(payload);
  }
};

const axios = require('axios');
const qs = require('qs');
const crypto = require('crypto');

const getCsrf = (data = {}, csrfValues = [], csrfKeys = [], iv = '') => {
  const string = csrfValues.join('') + csrfKeys.reduce((s, key) => s + data[key], '') + iv;
  const sha1Data = crypto.createHash('sha1').update(string).digest('hex');
  const md5Data = crypto.createHash('md5').update(sha1Data).digest('hex');
  // console.log('getCsrf', { string, sha1Data, md5Data });
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
    this.checkApiUrl = env === 'sandbox' ? 'https://thirdpartytest.global-business.com.tw/EDI/WebService.asmx/Get_Requests_Status' : 'https://thirdparty.global-business.com.tw/EDI/WebService.asmx/Get_Requests_Status';
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
      const { storeCode, iv } = this;

      let updatedData;
      if (payload.data) {
        updatedData = (options.csrfValues || options.csrfKeys) ? Object.assign(payload.data, {
          store_code: storeCode,
          csrf: getCsrf(payload.data, options.csrfValues, options.csrfKeys, iv),
        }) : payload.data;
        console.log(updatedData);
      }

      Object.assign(payload, {
        data: updatedData ? qs.stringify(updatedData, { encode: false }) : undefined,
      });

      console.log(payload);
      const { data } = await axios(payload);
      return data.response;
    } catch (e) {
      console.log(e);
      if (e.response && e.response.data && e.response.data.message) {
        throw new Error(e.response.data.message);
      }

      throw new Error(e.toJSON().message);
    }
  }

  async getQuote(order) {
    const { apiUrl } = this;
    const payload = {
      method: 'POST',
      url: `${apiUrl}/orders/quotation`,
      data: order,
      headers: await this.getApiHeaders(),
    };

    return this.request(payload, { csrfKeys: ['origin_area', 'dest_area'] });
  }

  async submitOrder(quoteId, order) {
    const { apiUrl } = this;
    const payload = {
      method: 'PUT',
      url: `${apiUrl}/orders/quotation/${quoteId}/confirm`,
      data: order,
      headers: await this.getApiHeaders(),
    };

    return this.request(payload, { csrfValues: [quoteId] });
  }

  async checkOrderStatus(requestId, type = 0) {
    const { checkApiUrl } = this;
    const payload = {
      method: 'POST',
      url: `${checkApiUrl}`,
      data: {
        scancode: '',
        Request_id: requestId,
        type, // 0:最新 1:歷程狀態
      },
      headers: await this.getApiHeaders(),
    };

    return this.request(payload);
  }

  async getBill(requestId) {
    const { apiUrl } = this;
    const payload = {
      method: 'GET',
      url: `${apiUrl}/bills/${requestId}`,
      headers: await this.getApiHeaders(),
    };

    return this.request(payload);
  }

  async listBills(yyyymm, page = 1, perPage = 20) {
    try {
      const { apiUrl } = this;
      const payload = {
        method: 'GET',
        url: `${apiUrl}/bills/list/${yyyymm}?page=${page}&per_page=${perPage}`,
        headers: await this.getApiHeaders(),
      };
      const res = await this.request(payload);
      return res;
    } catch (e) {
      if (e.message === '查無資料!') {
        return [];
      }

      throw new Error(e.message);
    }
  }
};

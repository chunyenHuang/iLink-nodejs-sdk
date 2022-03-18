const ILink = require('../ILink');
const { dev: credentials } = require('./credentials');

jest.setTimeout(30 * 1000);

describe('I-Link', () => {
  test('List bills', async () => {
    const iLink = new ILink(credentials);
    const result = await iLink.listBills('202203');
    expect(result.orders.length).toBeGreaterThanOrEqual(0);
  });

  test('Quote with rejection: Long distance', async () => {
    const iLink = new ILink(credentials);
    const quoteData = await iLink.getQuote({
      origin_area: '高雄市前金區',
      origin_address: '大同一路268號',
      dest_area: '台北市大安區',
      dest_address: '重慶南路1段122號',
      expected_get_at: '2022-03-07 14:10', // 預計取件
      expected_send_at: '2022-03-07 15:20', // 預計送達
    });

    expect(quoteData.final_fee).toEqual(79999);
    expect(quoteData.final_fee_remark).toEqual('實際距離:377.504km 已超過運費加價設定最大距離:5.00km');
  });

  test('Submit Order', async () => {
    const iLink = new ILink(credentials);
    const quoteData = await iLink.getQuote({
      origin_name: 'ABC', // 取件聯絡人
      origin_phone: '0910-000-000', // 取件電話
      origin_area: '高雄市前金區',
      origin_address: '大同一路268號',
      dest_area: '高雄市前金區',
      dest_address: '中正四路118號',
      expected_get_at: '2022-03-07 14:10', // 預計取件
      expected_send_at: '2022-03-07 15:20', // 預計送達
    });

    // console.log('quoteData', quoteData);

    const {
      id: quoteId,
      customer_code: cancelCode,
      final_fee: fee, // 數值須小於 1000
      final_fee_remark: errorMessage, // 此參數有值及final回傳極大值 將不配送。
    } = quoteData;

    // 確認訂單可配送
    expect(fee).toEqual(70);
    expect(errorMessage).toEqual('');

    const customerOrderNumber = `${Date.now()}`;

    const orderData = await iLink.submitOrder(quoteId, {
      order_no: customerOrderNumber,
      remarks: '餐點備註',
      send_name: '王大明', // 收件人姓名
      send_phone: '0910000000', // 收件人電話
      send_remarks: '送餐備註',
    });

    // console.log('orderData', orderData);

    const {
      request_id: orderId,
      // newrequest_id: orderMapId,
      status,
      order_no: orderNumber,
    } = orderData;

    expect(status).toEqual(1);
    expect(orderNumber).toEqual(customerOrderNumber);

    const orderStatusData = await iLink.checkOrderStatus(orderId, 0);
    console.log('orderStatusData', orderStatusData);
    // {
    //   "success": true,
    //   "data": [
    //       {
    //           "Type": "確認叫件",
    //           "Type_Code": "A00",
    //           "Time": "2022-03-07 15:42:39",
    //           "Salesrep_Code": "",
    //           "Salesrep_Phone": "",
    //           "Question_type": "",
    //           "Question_Memo": ""
    //       }
    //   ]
    // }

    const orderStatusHistoryData = await iLink.checkOrderStatus(orderId, 1);
    console.log('orderStatusHistoryData', orderStatusHistoryData);

    const cancelOrderData = await iLink.cancelOrder(orderId, cancelCode);
    console.log('cancelOrderData', cancelOrderData);
  });
});

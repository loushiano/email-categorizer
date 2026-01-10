import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export default class GptService {
  openai: OpenAI;
  constructor() {
    this.openai = new OpenAI();
  }

  async checkSubject(subject: string) {
    const role = 'user';
    const content = `I want you to carefully read the email subject that I will provide to you and provide an answer on whether
            that email subject comes from an email that is a receipt of a purchase or not. Emails that are not receipts can be promotional emails etc.
            The answer should be 'true' if it is a receipt and 'false' if it is not. Here is the subject: ${subject}`;
    return await this.callModel(role, content);
  }

  async getPurchase(html: string) {
    const role = 'user';
    const content = `I will provide you with the html body of an email. That email is the receipt of a purchase. I want your response to be a json object with the order details
            and a list of jsons objects, one object for each item purchased. Please don't provide markdown-style block markers in your response.
            The order json will have the following fields:
            'total' which is the total amount of the order returned as a numeric value and 'createdAt' which is the date of the order in the milliseconds epoch, 'orderNumber' which is the code of the order, 'currency' which is the ISO code of the currency of the order.
            Each of the items purchased json objects will have fields that represent the 'quantity' which is the quantity of the product specified as a numeric value,'product_code' which is the id/ unique code of the product specified as a string,
            'price' which is the price of the product specified as a numeric value, 'name' which is the name of the product,'link' which is the url of the product, and any specifications about the product, like color and size.
            In case any of the fields in the order json or the item jsons cannot be populated please replace its value with 'NA'.
            Here is the html body of the email: ${html}`;
    return await this.callModel(role, content);
  }

  async callModel(role, content) {
    const res = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini-2024-07-18',
      messages: [{ role, content }],
    });
    return res.choices[0].message.content;
  }
}

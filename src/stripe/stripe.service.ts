import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreditCardDTO } from 'src/users/card.dto';
import Stripe from 'stripe';

@Injectable()
export default class StripeService {
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    this.stripe = new Stripe(this.configService.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2022-08-01',
    });
  }

  public async createCharge(
    amount: number,
    total: number,
    accountId: string,
    customer: string,
    capture = false,
  ) {
    let newAmount = Math.ceil(amount * 100);
    let newFee = Math.floor(total * 100);
    let transfer = {};
    if (newFee) {
      transfer = {
        transfer_data: {
          amount: newFee,
          destination: accountId,
        },
      };
    }
    return (
      await this.stripe.charges.create({
        amount: newAmount,
        currency: 'CAD',
        customer,
        capture,
        ...transfer,
      })
    ).id;
  }

  public async chargeCustomer(amount: number, customer: string) {
    await this.createCharge(amount, 0, null, customer, true);
  }

  public async platformCharge(amount: number, customer: string) {
    let newAmount = Math.ceil(amount * 100);
    return (
      await this.stripe.charges.create({
        amount: newAmount,
        currency: 'CAD',
        customer,
        capture: true,
      })
    ).id;
  }

  public async cancelCharge(charge: string, customer: string) {
    return await this.stripe.refunds.create({
      charge: charge,
      customer: customer,
    });
  }

  public async removeCustomer(customer: string) {
    await this.stripe.customers.del(customer);
  }

  public async getCards(customer: string): Promise<CreditCardDTO[]> {
    try {
      let existing = (await this.stripe.customers.retrieve(
        customer,
      )) as Stripe.Customer;
      return (await this.stripe.customers.listSources(customer)).data.map(
        (item: Stripe.Card) => {
          let card: CreditCardDTO = new CreditCardDTO();
          card.last4 = item.last4;
          card.brand = item.brand;
          card.id = item.id;
          card.active = item.id == existing.default_source;
          return card;
        },
      );
    } catch (error) {
      return [];
    }
  }
  async deleteCard(customer: string, card: string) {
    await this.stripe.customers.deleteSource(customer, card);
  }

  public async createCustomer(email: string) {
    return (
      await this.stripe.customers.create({
        email,
      })
    ).id;
  }
  public async updateCustomer(id: string, email: string) {
    return (
      await this.stripe.customers.update(id, {
        email: email,
      })
    ).id;
  }

  public async attach(customer: string, card: CreditCardDTO) {
    let source = await this.createToken(card);
    return (
      await this.stripe.customers.createSource(customer, {
        source,
      })
    ).id;
  }

  public async getChargeCard(chargeId: string): Promise<CreditCardDTO> {
    let payment = (await this.stripe.charges.retrieve(chargeId))
      .payment_method_details;
    let card: CreditCardDTO = new CreditCardDTO();
    card.last4 = payment.card?.last4;
    card.brand = payment.card?.brand;
    return card;
  }

  public async addAccount() {
    return (
      await this.stripe.accounts.create({
        type: 'standard',
      })
    ).id;
  }
  public async createAccountLink(accountId: string) {
    return (
      await this.stripe.accountLinks.create({
        account: accountId,
        type: 'account_onboarding',
        return_url: 'https://halaleat.ca',
        refresh_url: 'https://halaleat.ca',
      })
    ).url;
  }

  public async payAccount(accountId: string, amount: number) {
    let newAmount = Math.floor(amount * 100);
    await this.stripe.transfers.create({
      destination: accountId,
      amount: newAmount,
      currency: 'CAD',
    });
  }

  public async createIntent(
    amount: number,
    fee: number,
    accountId: string,
    customer: string,
    capture: boolean,
  ) {
    let newAmount = Math.ceil(amount * 100);
    let newFee = Math.ceil(fee * 100);
    return (
      await this.stripe.paymentIntents.create({
        amount: newAmount,
        application_fee_amount: newFee,
        customer: customer,
        currency: 'CAD',
        transfer_data: {
          destination: accountId,
        },
      })
    ).id;
  }

  public async captureIntent(id: string) {
    await this.stripe.paymentIntents.capture(id);
  }
  public async captureChare(id: string) {
    await this.stripe.charges.capture(id);
  }

  public async makeCardDefault(customer: string, source_id: string) {
    await this.stripe.customers.update(customer, { default_source: source_id });
  }
  public async refundCharge(id: string) {
    await this.stripe.refunds.create({
      charge: id,
    });
  }
  public async createToken(card: CreditCardDTO) {
    return (
      await this.stripe.tokens.create({
        card: {
          cvc: card.csv,
          exp_month: card.expiry.split('/')[0],
          exp_year: card.expiry.split('/')[1],
          number: card.digits,
        },
      })
    ).id;
  }
}

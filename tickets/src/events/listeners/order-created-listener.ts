import { Message } from 'node-nats-streaming';
import { Listener, Subjects, OrderCreatedEvent } from "@ezhtix/common";
import { queueGroupName } from "./queue-group-name";
import { Ticket } from '../../models/ticket';
import { TicketUpdatedPublisher } from '../publishers/ticket-updated-publisher';


export class OrderCreatedListener extends Listener<OrderCreatedEvent> {
  subject: Subjects.OrderCreated = Subjects.OrderCreated;
  queueGroupName = queueGroupName;

  async onMessage(data: OrderCreatedEvent['data'], msg: Message) {
    // find the ticket the order is reserving 
    const ticket = await Ticket.findById(data.ticket.id);

    // if no ticket throw an error
    if (!ticket) {
      throw new Error('Ticket was NOT found!');
    }

    // mark the ticket as being reserved by setting its orderId property
    ticket.set({ orderId: data.id });

    // save the ticket 
    await ticket.save();

    // for listener to publish its own events
    await new TicketUpdatedPublisher(this.client).publish({
      id: ticket.id,
      price: ticket.price,
      title: ticket.title,
      userId: ticket.userId,
      orderId: ticket.orderId,
      version: ticket.version
    });

    // ack the message
    msg.ack();
  }
}
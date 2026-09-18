declare module "nodemailer" {
  type TransportOptions = Record<string, unknown>;
  type Message = {
    from?: string;
    to: string;
    subject: string;
    text?: string;
    html?: string;
    /** Encabezados extra, p. ej. List-Unsubscribe en los avisos. */
    headers?: Record<string, string>;
  };
  type Transporter = { sendMail(message: Message): Promise<unknown> };
  const nodemailer: { createTransport(options: TransportOptions): Transporter };
  export default nodemailer;
}

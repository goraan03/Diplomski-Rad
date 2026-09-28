export interface IEventPublisher {
  objavi(rutirajuciKljuc: string, payload: Record<string, unknown>): Promise<void>;
}

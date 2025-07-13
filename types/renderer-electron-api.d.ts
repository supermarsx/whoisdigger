export interface RendererElectronAPI<
  RendererToMain extends Record<string, any[]> = any,
  MainToRenderer extends Record<string, any[]> = any
> {
  send<C extends keyof RendererToMain>(channel: C, ...args: RendererToMain[C]): void;
  invoke<C extends keyof RendererToMain>(channel: C, ...args: RendererToMain[C]): Promise<any>;
  on<C extends keyof MainToRenderer>(
    channel: C,
    listener: (...args: MainToRenderer[C]) => void
  ): void;
}

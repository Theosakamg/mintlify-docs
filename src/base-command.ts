import {Command} from '@oclif/core';

import {globalFlags} from './config.js';
import initHookApp from './hooks/init/app.js';

export default abstract class UpsunDocCommand extends Command {
  static flags = {
    ...globalFlags,
  };

  /**
   * Initialize command - called before run()
   */
  public async init(): Promise<void> {
    await super.init();

    // Call the init hook manually with all required properties
    await initHookApp.call(this as any, {
      id: this.id,
      config: this.config,
      argv: this.argv,
      context: this as any,
    });
  }
}

import {Command} from '@oclif/core';

import {globalFlags} from './config.js';

export default abstract class UpsunDocCommand extends Command {
  static flags = {
    ...globalFlags,
  };
}

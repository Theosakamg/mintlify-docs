import { Flags } from '@oclif/core';

export const globalFlags = {
  config: Flags.string({
    char: 'c',
    description: 'Path to the configuration file',
    required: false,
  }),
};

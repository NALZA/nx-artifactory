import { output } from '@nrwl/devkit';
import * as chalk from 'chalk';

export class Logger {
  public debug(message: string): void {
    if (!process.env.NXCACHE_VERBOSE_LOGGING) {
      return;
    }

    output.addNewline();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (output as any).writeOutputTitle({
      label: chalk.reset.inverse.bold.keyword('grey')(' ARTIFACTORY-CLOUD '),
      title: chalk.keyword('grey')(message),
    });
    output.addNewline();
  }

  public error(message: string): void {
    output.addNewline();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (output as any).writeOutputTitle({
      label: chalk.reset.inverse.bold.red(' ARTIFACTORY-CLOUD '),
      title: chalk.bold.red(message),
    });
    output.addNewline();
  }

  public warn(message: string): void {
    output.addNewline();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (output as any).writeOutputTitle({
      label: chalk.reset.inverse.bold.yellow(' ARTIFACTORY-CLOUD '),
      title: chalk.bold.yellow(message),
    });
    output.addNewline();
  }

  public success(message: string): void {
    output.addNewline();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (output as any).writeOutputTitle({
      label: chalk.reset.inverse.bold.green(' ARTIFACTORY-CLOUD '),
      title: chalk.bold.green(message),
    });
    output.addNewline();
  }

  public note(message: string): void {
    output.addNewline();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (output as any).writeOutputTitle({
      label: chalk.reset.inverse.bold.keyword('orange')(' ARTIFACTORY-CLOUD '),
      title: chalk.keyword('orange')(message),
    });
    output.addNewline();
  }
}

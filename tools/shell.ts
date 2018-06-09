import * as childProcess from "child_process";
import * as path from "path";

/**
 * Execute command as child process.
 * Adds Node binaries directory to PATH for usability.
 */
export async function shell(command: string, cwd: string): Promise<void> {
  try {
    childProcess.execSync(command, {
      stdio: [null, process.stdout, process.stderr],
      env: { PATH: `${process.env.PATH}:${path.resolve("./node_modules/.bin")}` },
      cwd
    });
  } catch (error) {
    // Exit process in case of error.
    // Otherwise FuseBox logs error and returns 0.
    console.log(error); // tslint:disable-line
    // // TODO(H): Uncomment when rxjs type issue resolved.
    // process.exit(1);
  }
}

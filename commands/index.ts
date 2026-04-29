import { injectCliIndexCommand } from "./index.command.ts";
import { injectCliUpdateFieldCommand } from "./update-field.command.ts";
import { injectCliSetConfigCommand } from "./set-config.command.ts";
import {
  SET_CONFIG_COMMAND_NAME,
  UPDATE_FIELD_COMMAND_NAME,
} from "@scope/consts/cli";

const indexCommand = injectCliIndexCommand();
const updateFieldCommand = injectCliUpdateFieldCommand();
const setConfigCommand = injectCliSetConfigCommand();

indexCommand.command(UPDATE_FIELD_COMMAND_NAME, updateFieldCommand);
indexCommand.command(SET_CONFIG_COMMAND_NAME, setConfigCommand);

await indexCommand.parse();

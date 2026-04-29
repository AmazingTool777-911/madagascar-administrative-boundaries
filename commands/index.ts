import { injectCliIndexCommand } from "./index.command.ts";
import { injectCliUpdateFieldCommand } from "./update-field.command.ts";
import { injectCliSetConfigCommand } from "./set-config.command.ts";
import { injectCliClearCommand } from "./clear.command.ts";
import {
  CLEAR_COMMAND_NAME,
  SET_CONFIG_COMMAND_NAME,
  UPDATE_FIELD_COMMAND_NAME,
} from "@scope/consts/cli";

const indexCommand = injectCliIndexCommand();
const updateFieldCommand = injectCliUpdateFieldCommand();
const setConfigCommand = injectCliSetConfigCommand();
const clearCommand = injectCliClearCommand();

indexCommand.command(UPDATE_FIELD_COMMAND_NAME, updateFieldCommand);
indexCommand.command(SET_CONFIG_COMMAND_NAME, setConfigCommand);
indexCommand.command(CLEAR_COMMAND_NAME, clearCommand);

await indexCommand.parse();

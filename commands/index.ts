import { injectCliIndexCommand } from "./index.command.ts";
import { injectCliUpdateFieldCommand } from "./update-field.command.ts";
import { UPDATE_FIELD_COMMAND_NAME } from "@scope/consts/cli";

const indexCommand = injectCliIndexCommand();
const updateFieldCommand = injectCliUpdateFieldCommand();

indexCommand.command(UPDATE_FIELD_COMMAND_NAME, updateFieldCommand);

await indexCommand.parse();

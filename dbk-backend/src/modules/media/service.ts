//src/modules/media/service.ts

import { MedusaService } from "@medusajs/framework/utils";
import Video from "./models/video";

class MediaModuleService extends MedusaService({ Video }) {}
export default MediaModuleService;

//src/modules/media/index.ts

import { Module } from "@medusajs/framework/utils";
import MediaModuleService from "./service";

export const VIDEO_MODULE = "video";

export default Module(VIDEO_MODULE, {
  service: MediaModuleService,
});

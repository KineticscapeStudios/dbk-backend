import { Module } from "@medusajs/framework/utils";
import BannersModuleService from "./service";

export const BANNERS_MODULE = "banners";

export default Module(BANNERS_MODULE, {
  service: BannersModuleService,
});

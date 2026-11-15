// @vitest-environment jsdom
import {afterEach,expect,it,vi} from "vitest";
import {copyText} from "./copy-text";
afterEach(()=>vi.unstubAllGlobals());
it("copies in an HTTP preview and removes the temporary selection field",async()=>{
 vi.stubGlobal("navigator",{clipboard:undefined});const copy=vi.fn().mockReturnValue(true);
 Object.defineProperty(document,"execCommand",{value:copy,configurable:true});
 await copyText("Fictional summary");expect(copy).toHaveBeenCalledWith("copy");expect(document.querySelector("textarea")).toBeNull();
});
it("cleans up the field when the browser rejects copying",async()=>{
 vi.stubGlobal("navigator",{clipboard:undefined});Object.defineProperty(document,"execCommand",{value:()=>false,configurable:true});
 await expect(copyText("Fictional summary")).rejects.toThrow("Copy unavailable");expect(document.querySelector("textarea")).toBeNull();
});

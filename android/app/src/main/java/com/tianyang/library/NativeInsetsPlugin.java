package com.tianyang.library;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeInsets")
public class NativeInsetsPlugin extends Plugin {

    @PluginMethod
    public void getInsets(PluginCall call) {
        getBridge().executeOnMainThread(() -> {
            WindowInsetsCompat windowInsets = ViewCompat.getRootWindowInsets(getBridge().getWebView());
            Insets bars = windowInsets == null
                ? Insets.NONE
                : windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
                );

            float density = getActivity().getResources().getDisplayMetrics().density;
            JSObject result = new JSObject();
            result.put("top", bars.top / density);
            result.put("right", bars.right / density);
            result.put("bottom", bars.bottom / density);
            result.put("left", bars.left / density);
            call.resolve(result);
        });
    }
}

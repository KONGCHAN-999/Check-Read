jQuery.noConflict();

(async function ($, PLUGIN_ID) {
  "use strict";
  let GETFIELD = await kintone.api("/k/v1/preview/app/form/fields", "GET", {
    app: kintone.app.getId(),
  });
  class KintoneConfigManager {
    
    constructor() {
      this.$form = $(".box_container");
      this.appId = kintone.app.getId();
      this.apiEndpoint = kintone.api.url("/k/v1/preview/form", true);
      this.formProperties = null;
    }

    async init() {
      try {
        const response = await this.fetchFormProperties();
        this.formProperties = response.properties;
        await this.loadDefaultConfig();
        this.attachEventListeners();
      } catch (error) {
        console.error("Initialization failed:", error);
      }
    }

    fetchFormProperties() {
      return new Promise((resolve, reject) => {
        kintone.api(
          this.apiEndpoint,
          "GET",
          { app: this.appId },
          resolve,
          reject
        );
      });
    }

    async loadDefaultConfig() {
      try {
        const config = kintone.plugin.app.getConfig(PLUGIN_ID);
        if (!config) return;

        const savedConfig = JSON.parse(config.config || "[]");
        if (!savedConfig || savedConfig.length === 0) return;

        const configData = savedConfig[0]; // Get the first configuration entry
        
        // Set form field values
        $("#read_db_app_id").val(configData.read_db_app_id || "");
        $("#read_db_app_api_token").val(configData.read_db_app_api_token || "");
        $("#display_location").val(configData.display_location || "");
        $("#read_count_display_text").val(configData.read_count_display_text || "Read:{%Number%}");
        $("#reset_read_data").prop("checked", configData.reset_read_data);
        $("#title-color").val(configData.titleColor || "");
        $("#button-color").val(configData.buttonColor || "");
        $("#button-text-color").val(configData.buttonTextColor || "");

        console.log("Configuration loaded successfully:", configData);
      } catch (error) {
        console.error("Error loading configuration:", error);
      }
    }

    attachEventListeners() {
      this.$form.on("submit", (e) => this.handleSubmit(e));
    }
    
    handleSubmit(e) {
      e.preventDefault();
      const configData = [];
      let isValid = true;

      // Basic validation
      const read_db_app_id = $("#read_db_app_id").val();
      const read_count_display_text = $("#read_count_display_text").val();

      if (!read_db_app_id) {
        isValid = false;
        alert("Please enter the App ID");
        return;
      }

      if (!read_count_display_text) {
        isValid = false;
        alert("Please enter the Display Text");
        return;
      }

      configData.push({
        read_db_app_id: $("#read_db_app_id").val(),
        read_db_app_api_token: $("#read_db_app_api_token").val(),
        display_location: $("#display_location").val(),
        read_count_display_text: $("#read_count_display_text").val(),
        reset_read_data: $("#reset_read_data").is(":checked"),
        titleColor: $("#title-color").val(),
        buttonColor: $("#button-color").val(),
        buttonTextColor: $("#button-text-color").val(),
      });

      if (isValid) {
        kintone.plugin.app.setConfig({ config: JSON.stringify(configData) }, () => {
          console.log("Configuration saved:", configData);
        });
      }
    }
  }

  // Color picker
  const defaultColorPickerConfig = {
    opacity: false,
    doRender: false,
    buildCallback: function ($elm) {
      $elm.addClass("kintone-ui");

      const colorInstance = this.color;
      const colorPicker = this;

      $elm
        .prepend(
          '<div class="cp-panel">' +
            '<div><label>R</label> <input type="number" max="255" min="0" class="cp-r" /></div>' +
            '<div><label>G</label> <input type="number" max="255" min="0" class="cp-g" /></div>' +
            '<div><label>B</label> <input type="number" max="255" min="0" class="cp-b" /></div>' +
            "<hr>" +
            '<div><label>H</label> <input type="number" max="360" min="0" class="cp-h" /></div>' +
            '<div><label>S</label> <input type="number" max="100" min="0" class="cp-s" /></div>' +
            '<div><label>V</label> <input type="number" max="100" min="0" class="cp-v" /></div>' +
            "</div>"
        )
        .on("change", "input", function (e) {
          const value = this.value,
            className = this.className,
            type = className.split("-")[1],
            color = {};

          color[type] = value;
          colorInstance.setColor(
            type === "HEX" ? value : color,
            type === "HEX" ? "HEX" : /(?:r|g|b)/.test(type) ? "rgb" : "hsv"
          );
          colorPicker.render();
        });

      const buttons = $elm.append(
        '<div class="cp-disp">' +
          '<button type="button" id="cp-submit">OK</button>' +
          '<button type="button" id="cp-cancel">Cancel</button>' +
          "</div>"
      );

      buttons.on("click", "#cp-submit", (e) => {
        const colorCode = "#" + colorPicker.color.colors.HEX;

        $elm.css("border-bottom-color", colorCode);
        $elm.attr("value", colorCode);

        const $el = colorPicker.$trigger
          .parent("div")
          .find('input[type="text"]');
        $el.val(colorCode);
        $el.css("color", colorCode);

        colorPicker.$trigger.css("border-bottom-color", colorCode);
        colorPicker.toggle(false);
      });

      buttons.on("click", "#cp-cancel", (e) => {
        colorPicker.toggle(false);
      });
    },
    renderCallback: function ($elm, toggled) {
      const colors = this.color.colors.RND;
      const colorCode = "#" + this.color.colors.HEX;

      const modes = {
        r: colors.rgb.r,
        g: colors.rgb.g,
        b: colors.rgb.b,
        h: colors.hsv.h,
        s: colors.hsv.s,
        v: colors.hsv.v,
        HEX: colorCode,
      };

      $("input", ".cp-panel").each(function () {
        this.value = modes[this.className.substr(3)];
      });

      this.$trigger = $elm;
    },
    positionCallback: function ($elm) {
      this.color.setColor($elm.attr("value"));
    },
  };

  $(document).ready(() => {
    // Color Picker
    const colorPickerTitle = $("#font-color-picker-title-icon").colorPicker(
      defaultColorPickerConfig
    );
    const colorPickerButton = $("#bg-color-picker-button-icon").colorPicker(
      defaultColorPickerConfig
    );
    const colorPickerButtonText = $(
      "#font-color-picker-button-text-icon"
    ).colorPicker(defaultColorPickerConfig);

    $(document).keyup((event) => {
      const TAB_KEY_CODE = 9;
      const ENTER_KEY_CODE = 13;
      const ESC_KEY_CODE = 27;
      if (
        event.keyCode === TAB_KEY_CODE ||
        event.keyCode === ENTER_KEY_CODE ||
        event.keyCode === ESC_KEY_CODE
      ) {
        colorPickerTitle.colorPicker.toggle(false);
        colorPickerButton.colorPicker.toggle(false);
        colorPickerButtonText.colorPicker.toggle(false);
      }
    });

    // Initialize the config manager
    const configManager = new KintoneConfigManager();
    configManager.init();
  });
})(jQuery, kintone.$PLUGIN_ID);

jQuery.noConflict();

(function ($, PLUGIN_ID) {
  "use strict";

  class KintoneConfigManager {
    constructor() {
      this.$form = $(".box_container");
      this.appId = kintone.app.getId();
      this.apiEndpoint = kintone.api.url("/k/v1/preview/app/form/fields", true);
      this.formProperties = null;
    }

    async init() {
      try {
        const response = await this.fetchFormProperties();
        this.formProperties = response.properties;
        this.setupFormFields(); // Populate dropdown with Space field elementIds
        await this.loadDefaultConfig();
        this.attachEventListeners();
      } catch (error) {
        console.error("Initialization failed:", error);
      }
    }

    fetchFormProperties() {
      return new Promise((resolve, reject) => {
        kintone.api(this.apiEndpoint, "GET", { app: this.appId }, resolve, reject);
      });
    }

    setupFormFields() {
      // Populate Space field dropdown with elementIds
      const $spaceDropdown = $("#display_location");

      // Iterate through form properties to find SPACER fields
      Object.keys(this.formProperties).forEach((key) => {
        const field = this.formProperties[key];
        console.log("Field:", field);
        
        if (field.type === "SPACER" && field.elementId) {
          const $option = $('<option></option>')
            .val(field.elementId) // Value is the elementId
            .text(field.elementId); // Display text is the elementId
          $spaceDropdown.append($option);
        }
      });

      // If no Space fields are found, add a placeholder option
      if ($spaceDropdown.find("option").length === 1) {
        $spaceDropdown.append('<option value="" disabled>No Space Fields Available</option>');
      }
    }

    async loadDefaultConfig() {
      try {
        const config = kintone.plugin.app.getConfig(PLUGIN_ID);
        if (!config || !config.config) return;

        const savedConfig = JSON.parse(config.config);
        if (!savedConfig || savedConfig.length === 0) return;

        const configData = savedConfig[0];
        $("#read_db_app_id").val(configData.read_db_app_id || "");
        $("#read_db_app_api_token").val(configData.read_db_app_api_token || "");
        $("#display_location").val(configData.display_location || ""); // Load saved Space elementId
        $("#read_count_display_text").val(configData.read_count_display_text || "Read:{%Number%}");
        $("#reset_read_data").prop("checked", !!configData.reset_read_data);
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

      const read_db_app_id = $("#read_db_app_id").val();
      const read_count_display_text = $("#read_count_display_text").val();
      const display_location = $("#display_location").val();

      if (!read_db_app_id) {
        isValid = false;
        alert("Please enter the App ID");
      } else if (!read_count_display_text) {
        isValid = false;
        alert("Please enter the Display Text");
      } else if (!display_location) {
        isValid = false;
        alert("Please select a Space Field for display location");
      }

      if (!isValid) return;

      configData.push({
        read_db_app_id,
        read_db_app_api_token: $("#read_db_app_api_token").val(),
        display_location, // Save the selected Space elementId
        read_count_display_text,
        reset_read_data: $("#reset_read_data").is(":checked"),
        titleColor: $("#title-color").val(),
        buttonColor: $("#button-color").val(),
        buttonTextColor: $("#button-text-color").val(),
      });

      kintone.plugin.app.setConfig({ config: JSON.stringify(configData) }, () => {
        console.log("Configuration saved:", configData);
      });
    }
  }

  // Color picker config (unchanged)
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
        .on("change", "input", function () {
          const value = this.value;
          const className = this.className;
          const type = className.split("-")[1];
          const color = {};

          color[type] = value;
          colorInstance.setColor(
            type === "HEX" ? value : color,
            type === "HEX" ? "HEX" : /(?:r|g|b)/.test(type) ? "rgb" : "hsv"
          );
          colorPicker.render();
        });

      const $buttons = $elm.append(
        '<div class="cp-disp">' +
          '<button type="button" id="cp-submit">OK</button>' +
          '<button type="button" id="cp-cancel">Cancel</button>' +
          "</div>"
      );

      $buttons.on("click", "#cp-submit", () => {
        const colorCode = "#" + colorPicker.color.colors.HEX;
        $elm.css("border-bottom-color", colorCode);
        $elm.attr("value", colorCode);

        const $input = colorPicker.$trigger.parent("div").find('input[type="text"]');
        $input.val(colorCode).css("color", colorCode);
        colorPicker.$trigger.css("border-bottom-color", colorCode);
        colorPicker.toggle(false);
      });

      $buttons.on("click", "#cp-cancel", () => colorPicker.toggle(false));
    },
    renderCallback: function ($elm) {
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

      $(".cp-panel input", $elm).each(function () {
        this.value = modes[this.className.substr(3)];
      });

      this.$trigger = $elm;
    },
    positionCallback: function ($elm) {
      this.color.setColor($elm.attr("value"));
    },
  };

  $(document).ready(() => {
    // Initialize color pickers
    const colorPickerTitle = $("#font-color-picker-title-icon").colorPicker(defaultColorPickerConfig);
    const colorPickerButton = $("#bg-color-picker-button-icon").colorPicker(defaultColorPickerConfig);
    const colorPickerButtonText = $("#font-color-picker-button-text-icon").colorPicker(
      defaultColorPickerConfig
    );

    $(document).keyup((event) => {
      const TAB_KEY_CODE = 9;
      const ENTER_KEY_CODE = 13;
      const ESC_KEY_CODE = 27;
      if ([TAB_KEY_CODE, ENTER_KEY_CODE, ESC_KEY_CODE].includes(event.keyCode)) {
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
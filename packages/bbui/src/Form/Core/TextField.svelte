<script>
  import "@spectrum-css/textfield/dist/index-vars.css"
  import { createEventDispatcher } from "svelte"

  export let value = null
  export let placeholder = null
  export let type = "text"
  export let disabled = false
  export let error = null
  export let id = null
  export let readonly = false
  export let updateOnChange = true
  export let quiet = false

  const dispatch = createEventDispatcher()
  let focus = false

  const updateValue = value => {
    if (readonly) {
      return
    }
    if (type === "number") {
      const float = parseFloat(value)
      value = isNaN(float) ? null : float
    }
    dispatch("change", value)
  }

  const onFocus = () => {
    if (readonly) {
      return
    }
    focus = true
  }

  const onBlur = event => {
    if (readonly) {
      return
    }
    focus = false
    updateValue(event.target.value)
  }

  const onInput = event => {
    if (readonly || !updateOnChange) {
      return
    }
    updateValue(event.target.value)
  }

  const updateValueOnEnter = event => {
    if (readonly) {
      return
    }
    if (event.key === "Enter") {
      updateValue(event.target.value)
    }
  }
</script>

<div
  class="spectrum-Textfield"
  class:spectrum-Textfield--quiet={quiet}
  class:is-invalid={!!error}
  class:is-disabled={disabled}
  class:is-focused={focus}
>
  {#if error}
    <svg
      class="spectrum-Icon spectrum-Icon--sizeM spectrum-Textfield-validationIcon"
      focusable="false"
      aria-hidden="true"
    >
      <use xlink:href="#spectrum-icon-18-Alert" />
    </svg>
  {/if}
  <input
    {disabled}
    {readonly}
    {id}
    value={value || ""}
    placeholder={placeholder || ""}
    on:click
    on:blur
    on:focus
    on:input
    on:keyup
    on:blur={onBlur}
    on:focus={onFocus}
    on:input={onInput}
    on:keyup={updateValueOnEnter}
    {type}
    inputmode={type === "number" ? "decimal" : "text"}
    class="spectrum-Textfield-input"
  />
</div>

<style>
  .spectrum-Textfield {
    width: 100%;
  }
</style>

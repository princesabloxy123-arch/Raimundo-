# Resize Place Photos

Place Photos lets you access high-quality photographic content stored in the
Places database and get resizable images using Place Details, Nearby Search,
Text Search, or Autocomplete.

## Prerequisites

-   **Google Maps API Key**: An active API key with the **Maps JavaScript API**
    and **Places API (New)** enabled.
-   **Place Instance or ID**: A valid Place ID (e.g.,
    `ChIJydSuSkkUkFQRsqhB-cEtYnw`) or an existing `google.maps.places.Place`
    object obtained from a search or autocomplete response.

--------------------------------------------------------------------------------

## Workflow: Fetch and Resize Place Photos

### 1. Load the Places Library

Use `google.maps.importLibrary('places')` to load the `Place` class dynamically.

```javascript
const { Place } = await google.maps.importLibrary('places');
```

### 2. Request the `photos` Field

Instantiate a `Place` object with a Place ID and call `fetchFields()`, including
`'photos'` in the requested `fields` array. This populates `place.photos` with
an array of up to 10 `Photo` objects.

```javascript
const place = new Place({
    id: 'ChIJydSuSkkUkFQRsqhB-cEtYnw', // Woodland Park Zoo, Seattle WA
});

await place.fetchFields({
    fields: ['displayName', 'photos'],
});
```

### 3. Resize the Photo using `getURI()`

Call `getURI(options)` on a `Photo` instance to generate the image source URI.
Pass a `PhotoOptions` object containing `maxHeight` and/or `maxWidth` (in
pixels):

-   **Single dimension (`maxHeight` or `maxWidth`)**: Scales the image to that
    dimension while maintaining the original aspect ratio.
-   **Both dimensions (`maxHeight` and `maxWidth`)**: Resizes the image to fit
    within the smaller of the two constraints while maintaining the original
    aspect ratio.
-   **No dimensions (`getURI()`)**: Returns the full-size image.

```javascript
if (place.photos && place.photos.length > 0) {
    const photo = place.photos[0];

    // Resize to a maximum height of 400px
    const resizedUri = photo.getURI({ maxHeight: 400 });

    // Resize to fit within a 600x400 bounding box
    const boundedUri = photo.getURI({ maxWidth: 600, maxHeight: 400 });
}
```

### 4. Render Required Author Attributions

When you display a Place photo, **you must display its author attributions**.
Access `photo.authorAttributions` (an array of `AuthorAttribution` objects) and
display the `displayName` linked to the author's `uri`.

```javascript
function createAttribution(attribution) {
    const attributionLink = document.createElement('a');
    attributionLink.classList.add('attribution-label');
    attributionLink.textContent = attribution.displayName;
    if (attribution.uri) {
        attributionLink.href = attribution.uri;
        attributionLink.target = '_blank';
        attributionLink.rel = 'noopener noreferrer';
    }
    return attributionLink;
}
```

--------------------------------------------------------------------------------

## Complete Example

The following example fetches photos for a place, renders a thumbnail gallery
resized to `maxHeight: 380`, displays a larger `maxHeight: 800` version when
selected, and renders the required author attribution overlay.

### HTML

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Resize Place Photos</title>
    <style>
      body {
        font-family: sans-serif;
        margin: 24px;
      }
      #expanded-image {
        position: relative;
        width: 500px;
        height: 400px;
        border-radius: 12px;
        overflow: hidden;
        background: #111;
        margin-bottom: 16px;
      }
      #expanded-image img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
      #gallery {
        display: flex;
        gap: 8px;
        overflow-x: auto;
      }
      #gallery img {
        height: 100px;
        border-radius: 8px;
        cursor: pointer;
      }
      .attribution-label {
        position: absolute;
        bottom: 10px;
        right: 10px;
        background-color: rgba(0, 0, 0, 0.65);
        color: #fff;
        padding: 6px 12px;
        border-radius: 16px;
        font-size: 0.8rem;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <h1 id="heading"></h1>
    <p id="summary"></p>
    <div id="expanded-image"></div>
    <div id="gallery"></div>

    <!-- Dynamic Library Import Bootstrap -->
    <script>
      (g=>{var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement("script"));e.set("libraries",[...r]+"");for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);e.set("callback",c+".maps."+q);a.src=`https://maps.${c}apis.com/maps/api/js?`+e;d[q]=f;a.onerror=()=>h=n(Error(p+" could not load."));a.nonce=m.querySelector("script[nonce]")?.nonce||"";m.head.append(a)}));d[l]?console.warn(p+" only loads once. Ignoring:",g):d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})({
        key: "YOUR_API_KEY",
        v: "weekly"
      });
    </script>
    <script type="module" src="./index.js"></script>
  </body>
</html>
```

### JavaScript (`index.js`)

Based on official Google Maps Platform samples
([samples/place-photos/index.ts](https://github.com/googlemaps/js-samples/blob/HEAD/samples/place-photos/index.ts?utm_campaign=gmp_git_agentskills_v1)):

```javascript
async function init() {
    const { Place } = await google.maps.importLibrary('places');

    const heading = document.getElementById('heading');
    const summary = document.getElementById('summary');
    const gallery = document.getElementById('gallery');
    const expandedImageDiv = document.getElementById('expanded-image');

    try {
        // Use a Place ID to create a new Place instance
        const place = new Place({
            id: 'ChIJydSuSkkUkFQRsqhB-cEtYnw', // Woodland Park Zoo, Seattle WA
        });

        // Fetch displayName, photos, and editorialSummary
        await place.fetchFields({
            fields: ['displayName', 'photos', 'editorialSummary'],
        });

        heading.textContent = place.displayName ?? '';
        summary.textContent = place.editorialSummary ?? '';

        if (place.photos && place.photos.length > 0) {
            // Render the first photo in the expanded view (resized to maxHeight: 800)
            renderExpandedPhoto(place.photos[0], place.displayName);

            // Populate thumbnail gallery (resized to maxHeight: 380)
            place.photos.forEach((photo) => {
                const thumbImg = document.createElement('img');
                thumbImg.src = photo.getURI({ maxHeight: 380 });
                thumbImg.alt = `Thumbnail of ${place.displayName}`;

                thumbImg.addEventListener('click', (event) => {
                    event.preventDefault();
                    renderExpandedPhoto(photo, place.displayName);
                });

                gallery.appendChild(thumbImg);
            });
        } else {
            expandedImageDiv.textContent = 'No photos available for this location.';
        }
    } catch (error) {
        console.error('Failed to fetch place details:', error);
        summary.textContent = 'Failed to load place photos.';
    }

    function renderExpandedPhoto(photo, placeName) {
        expandedImageDiv.innerHTML = '';

        const img = document.createElement('img');
        img.alt = `Photo of ${placeName ?? 'place'}`;
        img.src = photo.getURI({ maxHeight: 800 });
        expandedImageDiv.appendChild(img);

        if (photo.authorAttributions && photo.authorAttributions.length > 0) {
            expandedImageDiv.appendChild(
                createAttribution(photo.authorAttributions[0])
            );
        }
    }

    function createAttribution(attribution) {
        const attributionLabel = document.createElement('a');
        attributionLabel.classList.add('attribution-label');
        attributionLabel.textContent = attribution.displayName;
        if (attribution.uri) {
            attributionLabel.href = attribution.uri;
            attributionLabel.target = '_blank';
            attributionLabel.rel = 'noopener noreferrer';
        }
        return attributionLabel;
    }
}

void init();
```

--------------------------------------------------------------------------------

## Alternative: Using Places UI Kit Web Components

If you are using the Places UI Kit (`<gmp-place-details>` or
`<gmp-place-search>`), you can configure media sizing declaratively using
`<gmp-place-media>` and `google.maps.places.MediaSize` without manually calling
`getURI()`.

Based on official React Google Maps samples
([examples/places-ui-kit/src/components/place-content-config.tsx](https://github.com/visgl/react-google-maps/blob/HEAD/examples/places-ui-kit/src/components/place-content-config.tsx?utm_campaign=gmp_git_agentskills_v1)):

```html
<gmp-place-details internal-usage-attribution-ids="gmp_git_agentskills_v1">
  <gmp-place-details-place-request place="ChIJydSuSkkUkFQRsqhB-cEtYnw"></gmp-place-details-place-request>
  <gmp-place-content-config>
    <gmp-place-media id="place-media"></gmp-place-media>
    <gmp-place-attribution></gmp-place-attribution>
  </gmp-place-content-config>
</gmp-place-details>

<script type="module">
  await google.maps.importLibrary('places');
  const mediaEl = document.getElementById('place-media');
  mediaEl.preferredSize = google.maps.places.MediaSize.MEDIUM;
  mediaEl.lightboxPreferred = true;
</script>
```

--------------------------------------------------------------------------------

## Reference: `Photo` Class Properties & Methods

Property / Method    | Type                                                    | Description
:------------------- | :------------------------------------------------------ | :----------
`getURI(options?)`   | `(options?: google.maps.places.PhotoOptions) => string` | Returns the image URI. Accepts `{ maxHeight?: number, maxWidth?: number }`.
`authorAttributions` | `Array<google.maps.places.AuthorAttribution>`           | Required attribution data (`displayName`, `uri`, `photoURI`).
`heightPx`           | `number`                                                | The maximum original height of the photo in pixels.
`widthPx`            | `number`                                                | The maximum original width of the photo in pixels.
`flagContentURI`     | `string \| null`                                        | A link where users can flag a problem with the photo.
`googleMapsURI`      | `string \| null`                                        | A link to view the photo directly on Google Maps.

--------------------------------------------------------------------------------

## Compliance & Best Practices

1.  **No Caching of Photo URIs**: Do **not** cache or store the URIs returned by
    `photo.getURI()` or the images themselves. Always retrieve photo data from a
    fresh `Place` object in compliance with Section 3.2.3(b) (No Caching) of the
    [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms/).
2.  **Mandatory Attributions**: Whenever you display a photo from
    `place.photos`, you must clearly display the `authorAttributions`
    (`displayName` and `uri`) alongside or overlaid on the image.
3.  **Bandwidth Optimization**: Avoid calling `photo.getURI()` without arguments
    unless you explicitly need the full-resolution original image. Always
    specify `maxWidth` or `maxHeight` matching your UI container's display
    dimensions (e.g., `maxHeight: 400` for cards or `maxHeight: 800` for
    modals).

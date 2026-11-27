import heroCelebrationImg from "../../assets/events/events-hero-celebration.jpg";
import cricketReal1Img from "../../assets/events/cricket-real-1.jpg";
import cricketReal2Img from "../../assets/events/cricket-real-2.jpg";
import cricketReal3Img from "../../assets/events/cricket-real-3.jpg";
import potluckGatheringImg from "../../assets/events/potluck-gathering.jpg";
import potluckDishesImg from "../../assets/events/potluck-dishes.jpg";
import traditionalRealCoverImg from "../../assets/events/traditional-real-cover.jpg";
import traditionalReal1Img from "../../assets/events/traditional-real-1.jpg";
import traditionalReal2Img from "../../assets/events/traditional-real-2.jpg";
import traditionalReal3Img from "../../assets/events/traditional-real-3.jpg";

/**
 * Centralized Office Events configuration.
 *
 * How to update for real PIRNAV company events:
 * 1. Replace temporary image files inside `src/assets/events/` or update the imports above.
 * 2. Set `date` to a confirmed ISO string ("YYYY-MM-DD") so cards format automatically
 *    and sort newest-first. Leave `date: null` until confirmed.
 * 3. Add or remove photos inside each event's `galleryImages` array; photo counts update dynamically.
 */
export const EVENTS_HERO_IMAGE = {
  src: heroCelebrationImg,
  alt: "Illustrative corporate team celebration gathering in a modern office",
};

export const officeEvents = [
  {
    id: "cricket-tournament",
    title: "Cricket Tournament",
    date: "2026-04-24",
    datePlaceholder: {
      day: "TBD",
      month: "Date",
      year: "Soon",
    },
    description:
      "A celebration of teamwork, sportsmanship and friendly competition, bringing our colleagues together beyond the workplace.",
    icon: "cricket",
    accent: "orange",
    coverImage: {
      src: cricketReal1Img,
      alt: "PIRNAV cricket team holding the winners trophy together after the tournament",
    },
    galleryImages: [
      {
        src: cricketReal1Img,
        alt: "PIRNAV team celebrating with the cricket tournament winners trophy",
        caption: "Champions Trophy Celebration — PIRNAV Cricket Tournament",
      },
      {
        src: cricketReal2Img,
        alt: "PIRNAV players receiving the cricket tournament trophy at the presentation",
        caption: "Trophy Presentation Ceremony",
      },
      {
        src: cricketReal3Img,
        alt: "PIRNAV cricket squad posing together on the field with the winners trophy",
        caption: "Team Squad with the Winners Trophy",
      },
    ],
  },
  {
    id: "potluck",
    title: "Potluck",
    date: null,
    datePlaceholder: {
      day: "TBD",
      month: "Date",
      year: "Soon",
    },
    description:
      "A delightful gathering where our team members came together to share homemade dishes, explore diverse cuisines and enjoy memorable moments.",
    icon: "potluck",
    accent: "teal",
    coverImage: {
      src: potluckGatheringImg,
      alt: "Illustrative colleagues sharing homemade dishes around an office potluck table",
    },
    galleryImages: [
      {
        src: potluckGatheringImg,
        alt: "Illustrative office potluck gathering around a shared lunch table",
        caption: "Team Potluck Gathering (Temporary Sample)",
      },
      {
        src: potluckDishesImg,
        alt: "Illustrative assortment of homemade cuisines at an office potluck spread",
        caption: "Homemade Culinary Spread (Temporary Sample)",
      },
    ],
  },
  {
    id: "traditional-day",
    title: "Traditional Day",
    date: null,
    datePlaceholder: {
      day: "TBD",
      month: "Date",
      year: "Soon",
    },
    description:
      "A vibrant celebration of cultural diversity, traditional attire and togetherness at PIRNAV.",
    icon: "traditional",
    accent: "orange",
    coverImage: {
      src: traditionalRealCoverImg,
      alt: "PIRNAV team members posing together in vibrant traditional ethnic attire on Traditional Day",
    },
    galleryImages: [
      {
        src: traditionalReal1Img,
        alt: "Eight PIRNAV colleagues posing together in sarees, kurtas, and traditional veshti attire",
        caption: "Traditional Day Team Portrait",
      },
      {
        src: traditionalReal2Img,
        alt: "PIRNAV colleagues smiling together in festive kurtas, half sarees, and traditional outfits",
        caption: "Cultural Attire Group Celebration",
      },
      {
        src: traditionalReal3Img,
        alt: "PIRNAV team members celebrating Traditional Day inside the office in ethnic outfits",
        caption: "Festive Office Celebration Moments",
      },
    ],
  },
];

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Returns display parts `{ day, month, year, isConfirmed }` for the timeline date card.
 */
export const formatEventDateParts = (eventItem) => {
  if (eventItem?.date) {
    const parsed = new Date(`${eventItem.date}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return {
        day: String(parsed.getDate()).padStart(2, "0"),
        month: MONTHS_SHORT[parsed.getMonth()],
        year: String(parsed.getFullYear()),
        isConfirmed: true,
      };
    }
  }

  return {
    day: eventItem?.datePlaceholder?.day || "TBD",
    month: eventItem?.datePlaceholder?.month || "Date",
    year: eventItem?.datePlaceholder?.year || "Pending",
    isConfirmed: false,
  };
};

/**
 * Sorts events with confirmed ISO dates in descending chronological order,
 * preserving configured array order for events whose dates are pending.
 */
export const getSortedOfficeEvents = (items = officeEvents) =>
  items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aTime = a.item.date ? Date.parse(`${a.item.date}T00:00:00`) : Number.NaN;
      const bTime = b.item.date ? Date.parse(`${b.item.date}T00:00:00`) : Number.NaN;
      const aValid = !Number.isNaN(aTime);
      const bValid = !Number.isNaN(bTime);

      if (aValid && bValid && bTime !== aTime) return bTime - aTime;
      if (aValid !== bValid) return aValid ? -1 : 1;
      return a.index - b.index;
    })
    .map(({ item }) => item);

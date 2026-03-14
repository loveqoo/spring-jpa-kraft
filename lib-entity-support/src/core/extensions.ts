import dayjs from "dayjs";

export const toFormattedString = (
    date: Date,
    format: string = 'YYYY-MM-DD HH:mm:ss'
) => dayjs(date).format(format)

export const equalsIgnoreCase = (
    a: string, b: string
) => a.toLowerCase() === b.toLowerCase()
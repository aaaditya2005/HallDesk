import "./Timeline.css";

function Timeline({ timeline }) {

  return (
    <div className="timeline">

      {timeline.map((item, index) => (

        <div
          className="timeline-item"
          key={index}
        >

          <div className="timeline-dot"></div>

          {index !== timeline.length - 1 && (
            <div className="timeline-line"></div>
          )}

          <div className="timeline-content">

            <h3 className="timeline-action">
              {item.action}
            </h3>

            <p className="timeline-remark">
              {item.remark}
            </p>

            <p className="timeline-user">
              <strong>By:</strong>{" "}
              {item.by?.name}
              {" "}
              (
              {item.by?.role}
              )
            </p>

            <p className="timeline-time">
              {new Date(
                item.timestamp
              ).toLocaleString()}
            </p>

          </div>

        </div>

      ))}

    </div>
  );
}

export default Timeline;